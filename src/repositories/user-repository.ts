import { compare, hash } from "bcryptjs";
import { isValidObjectId, type PipelineStage } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { escapeRegex } from "@/lib/regex";
import { lookupCatalogNameStage } from "@/repositories/catalog-lookup";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { UserModel } from "@/repositories/models/user-model";
import { resolveSort } from "@/repositories/sort";
import type { CreateUserInput, UpdateUserInput } from "@/schemas/user";
import type { AppUser, Role } from "@/types/user";
import type { ListResult, SortDir } from "@/types/list-query";

const USER_SORT_FIELD_MAP = {
  name: "name",
  username: "username",
  role: "role",
  active: "active",
  position: "position",
  projectSite: "projectSite",
} as const;

export type UserListFilters = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
  query?: string;
  role?: Role;
  status?: "active" | "inactive";
};

export interface UserRepository {
  findAll(filters: UserListFilters): Promise<ListResult<AppUser>>;
  findById(id: string): Promise<AppUser | null>;
  findByEmployeeId(employeeId: string): Promise<AppUser | null>;
  /** Every username currently in use — for generating a new roster-driven username that can't collide. */
  listAllUsernames(): Promise<string[]>;
  /** Batch resolves employeeId -> username for a roster listing, mirroring the catalog-name-resolution pattern. */
  findUsernamesByEmployeeIds(employeeIds: string[]): Promise<Map<string, string>>;
  verifyPassword(id: string, password: string): Promise<boolean>;
  create(input: CreateUserInput): Promise<AppUser>;
  update(id: string, patch: UpdateUserInput): Promise<AppUser>;
}

type UserDocument = {
  _id: { toString(): string };
  username: string;
  email?: string;
  name: string;
  role: Role;
  active: boolean;
  employeeId?: string;
  mustChangePassword: boolean;
  createdAt: Date;
};

function toAppUser(doc: UserDocument): AppUser {
  return {
    id: doc._id.toString(),
    username: doc.username,
    email: doc.email,
    name: doc.name,
    role: doc.role,
    active: doc.active,
    employeeId: doc.employeeId,
    mustChangePassword: doc.mustChangePassword,
    createdAt: doc.createdAt.toISOString(),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 11000,
  );
}

export class MongoUserRepository implements UserRepository {
  async findAll(filters: UserListFilters): Promise<ListResult<AppUser>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const sort = resolveSort(filters.sortBy, filters.sortDir, USER_SORT_FIELD_MAP, {
      createdAt: -1,
    });
    const match: Record<string, unknown> = {};
    if (filters.role) match.role = filters.role;
    if (filters.status) match.active = filters.status === "active";
    if (filters.query?.trim()) {
      const pattern = new RegExp(escapeRegex(filters.query.trim()), "i");
      match.$or = [{ name: pattern }, { username: pattern }, { email: pattern }];
    }
    // position/projectSite aren't fields on User at all — they're resolved
    // through the linked Employee's positionId/projectSiteId, two hops away
    // — so sorting/filtering by them needs an aggregation, not a plain
    // find(). A user with no employeeId (a manually-created account) simply
    // never matches the $lookup and falls through to the "—" fallback,
    // same convention as a deleted-catalog-entry resolution elsewhere.
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: EmployeeModel.collection.name,
          let: { employeeId: "$employeeId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", { $convert: { input: "$$employeeId", to: "objectId", onError: null, onNull: null } }],
                },
              },
            },
            { $project: { _id: 0, positionId: 1, projectSiteId: 1 } },
          ],
          as: "_employee",
        },
      },
      { $addFields: { _employee: { $arrayElemAt: ["$_employee", 0] } } },
      lookupCatalogNameStage("_employee.positionId", "_position") as PipelineStage,
      lookupCatalogNameStage("_employee.projectSiteId", "_projectSite") as PipelineStage,
      {
        $addFields: {
          position: { $ifNull: [{ $arrayElemAt: ["$_position.name", 0] }, "—"] },
          projectSite: { $ifNull: [{ $arrayElemAt: ["$_projectSite.name", 0] }, "—"] },
        },
      },
      // aggregate() bypasses Mongoose's schema-level `select: false`, so the
      // sensitive/internal fields it normally hides have to be dropped here
      // explicitly instead.
      { $project: { passwordHash: 0, activeSessionId: 0, lastActivityAt: 0, _employee: 0, _position: 0, _projectSite: 0 } },
      {
        $facet: {
          data: [{ $sort: sort }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await UserModel.aggregate<{
      data: (UserDocument & { position: string; projectSite: string })[];
      totalCount: { count: number }[];
    }>(pipeline);
    const items = (result?.data ?? []).map((doc) => ({
      ...toAppUser(doc),
      position: doc.position,
      projectSite: doc.projectSite,
    }));
    const total = result?.totalCount[0]?.count ?? 0;
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<AppUser | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).lean<UserDocument | null>();
    return doc ? toAppUser(doc) : null;
  }

  async findByEmployeeId(employeeId: string): Promise<AppUser | null> {
    const doc = await UserModel.findOne({ employeeId }).lean<UserDocument | null>();
    return doc ? toAppUser(doc) : null;
  }

  async listAllUsernames(): Promise<string[]> {
    const docs = await UserModel.find().select("username").lean<{ username: string }[]>();
    return docs.map((doc) => doc.username);
  }

  async findUsernamesByEmployeeIds(employeeIds: string[]): Promise<Map<string, string>> {
    if (employeeIds.length === 0) return new Map();
    const docs = await UserModel.find({ employeeId: { $in: employeeIds } })
      .select("employeeId username")
      .lean<{ employeeId: string; username: string }[]>();
    return new Map(docs.map((doc) => [doc.employeeId, doc.username]));
  }

  async verifyPassword(id: string, password: string): Promise<boolean> {
    if (!isValidObjectId(id)) return false;
    const doc = await UserModel.findById(id).select("+passwordHash").lean<{ passwordHash: string } | null>();
    if (!doc) return false;
    return compare(password, doc.passwordHash);
  }

  async create(input: CreateUserInput): Promise<AppUser> {
    const passwordHash = await hash(input.password, 12);
    try {
      const doc = await UserModel.create({
        username: input.username.trim().toLowerCase(),
        email: input.email?.trim().toLowerCase(),
        name: input.name,
        role: input.role,
        employeeId: input.employeeId,
        passwordHash,
        active: true,
      });
      return toAppUser(doc.toObject() as UserDocument);
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new ConflictError("A user with this username already exists");
      throw error;
    }
  }

  async update(id: string, patch: UpdateUserInput): Promise<AppUser> {
    if (!isValidObjectId(id)) throw new NotFoundError("User not found");
    const { password, username, email, ...rest } = patch;
    const update: Record<string, unknown> = { ...rest };
    if (username) update.username = username.trim().toLowerCase();
    if (email) update.email = email.trim().toLowerCase();
    if (password) update.passwordHash = await hash(password, 12);
    try {
      const doc = await UserModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean<UserDocument | null>();
      if (!doc) throw new NotFoundError("User not found");
      return toAppUser(doc);
    } catch (error) {
      if (isDuplicateKeyError(error)) throw new ConflictError("A user with this username already exists");
      throw error;
    }
  }
}

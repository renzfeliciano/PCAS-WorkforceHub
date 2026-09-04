import { hash } from "bcryptjs";
import { isValidObjectId } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
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
} as const;

export type UserListFilters = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
};

export interface UserRepository {
  findAll(filters: UserListFilters): Promise<ListResult<AppUser>>;
  findById(id: string): Promise<AppUser | null>;
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
    const [docs, total] = await Promise.all([
      UserModel.find()
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<UserDocument[]>(),
      UserModel.countDocuments(),
    ]);
    return { items: docs.map(toAppUser), total, page, pageSize };
  }

  async findById(id: string): Promise<AppUser | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await UserModel.findById(id).lean<UserDocument | null>();
    return doc ? toAppUser(doc) : null;
  }

  async create(input: CreateUserInput): Promise<AppUser> {
    const passwordHash = await hash(input.password, 12);
    try {
      const doc = await UserModel.create({
        username: input.username.trim().toLowerCase(),
        email: input.email?.trim().toLowerCase(),
        name: input.name,
        role: input.role,
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

import { create } from "zustand";
import { jobApplicationsClient } from "@/features/recruitment/api/job-applications-client";
import type { JobApplicationInput } from "@/schemas/job-application";
import type { JobApplication } from "@/types/job-application";

type JobApplicationsState = {
  applications: JobApplication[];
  isLoading: boolean;
  error: string;
  /** Seeds the store from server-rendered data — no network round-trip. */
  hydrate: (items: JobApplication[]) => void;
  fetchApplications: () => Promise<void>;
  addApplication: (input: JobApplicationInput) => Promise<void>;
  editApplication: (id: string, input: JobApplicationInput) => Promise<void>;
  /**
   * Drag-and-drop and delete apply to the local list immediately and roll
   * back on failure — the two actions where instant feedback matters most
   * (a card visibly moving/disappearing on drop or delete). Add/edit happen
   * behind a modal submit, where the button's own loading state is already
   * the feedback, so those just apply the server's response once it lands.
   */
  updateStage: (id: string, stageId: string) => Promise<void>;
  removeApplication: (id: string) => Promise<void>;
};

export const useJobApplicationsStore = create<JobApplicationsState>((set, get) => ({
  applications: [],
  isLoading: true,
  error: "",

  hydrate(items) {
    set({ applications: items, isLoading: false, error: "" });
  },

  async fetchApplications() {
    set({ isLoading: true });
    try {
      const result = await jobApplicationsClient.list();
      set({ applications: result.items, error: "", isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to load applications.",
        isLoading: false,
      });
    }
  },

  async addApplication(input) {
    const created = await jobApplicationsClient.create(input);
    set((state) => ({ applications: [created, ...state.applications] }));
  },

  async editApplication(id, input) {
    const updated = await jobApplicationsClient.update(id, input);
    set((state) => ({
      applications: state.applications.map((application) =>
        application.id === id ? updated : application,
      ),
    }));
  },

  async updateStage(id, stageId) {
    const previous = get().applications;
    const application = previous.find((item) => item.id === id);
    if (!application || application.stageId === stageId) return;
    // Column grouping keys off stageId, so the card visibly moves right
    // away; the resolved display name (`stage`) is left as-is until the
    // server's response lands a moment later, rather than guessing it here.
    set({
      applications: previous.map((item) => (item.id === id ? { ...item, stageId } : item)),
    });
    try {
      const updated = await jobApplicationsClient.moveStage(id, stageId);
      set((state) => ({
        applications: state.applications.map((item) => (item.id === id ? updated : item)),
      }));
    } catch (err) {
      set({
        applications: previous,
        error: err instanceof Error ? err.message : "Failed to move the application.",
      });
    }
  },

  async removeApplication(id) {
    const previous = get().applications;
    set({ applications: previous.filter((item) => item.id !== id) });
    try {
      await jobApplicationsClient.delete(id);
    } catch (err) {
      set({
        applications: previous,
        error: err instanceof Error ? err.message : "Failed to delete the application.",
      });
    }
  },
}));

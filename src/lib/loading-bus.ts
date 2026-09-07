type Listener = (pending: boolean) => void;

export type LoadingBus = {
  begin: () => void;
  end: () => void;
  subscribe: (listener: Listener) => () => void;
};

function createLoadingBus(): LoadingBus {
  let count = 0;
  const listeners = new Set<Listener>();

  function emit() {
    const pending = count > 0;
    listeners.forEach((listener) => listener(pending));
  }

  return {
    begin() {
      count += 1;
      emit();
    },
    end() {
      count = Math.max(0, count - 1);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** Drives the full-screen branded loader while a route/module change is in flight. */
export const navigationLoadingBus = createLoadingBus();
/** Drives the slim top progress bar while API requests are in flight. */
export const requestLoadingBus = createLoadingBus();

export interface TimeAuthority {
  getNow(): number;
  setNowForReplay?(fixed: number): void;
  clearReplay?(): void;
}

let replayTime: number | null = null;

export const timeAuthority: TimeAuthority = {
  getNow(): number {
    if (replayTime !== null) {
      return replayTime;
    }
    return Date.now();
  },
  setNowForReplay(fixed: number): void {
    replayTime = fixed;
  },
  clearReplay(): void {
    replayTime = null;
  }
};

export enum BucketStatus {
  pass,
  fail,
  pending,
  skipping,
  cancel,
  none
}

export class GitState {
  private _repo: string;
  private _prNumber: string;
  private _state: BucketStatus;

  constructor() {
    this._repo = "dexcom-inc/therapeutic-portal";
    this._prNumber = null;
    this._state = BucketStatus.none;
  }


  get repo(): string {
    return this._repo;
  }

  set repo(value: string) {
    this._repo = value;
  }

  get prNumber(): string {
    return this._prNumber;
  }

  set prNumber(value: string) {
    this._prNumber = value;
  }


  get state(): BucketStatus {
    return this._state;
  }

  set state(value: BucketStatus) {
    this._state = value;
  }
}

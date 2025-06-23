

interface ChangeEvent {
    type: "thumbMoved" | "thumbsReset" | "colorChanged";
    thumbCount: number;
    values: number[];
    colors: string[];
    ranges: RangeData[];
    movedIndex?: number;
}

interface RangeData {
    min: number;
    max: number;
    color: string;
}

export type { ChangeEvent, RangeData };
/** 泳法（DBの stroke と一致） */
export type DrillStroke = 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly';

export const DRILL_STROKES: DrillStroke[] = [
  'freestyle',
  'backstroke',
  'breaststroke',
  'butterfly',
];

export const DRILL_STROKE_LABEL: Record<DrillStroke, string> = {
  freestyle: '自由形',
  backstroke: '背泳ぎ',
  breaststroke: '平泳ぎ',
  butterfly: 'バタフライ',
};

export interface DrillItem {
  id: string;
  stroke: DrillStroke;
  title: string;
  youtube_video_id: string;
  overview: string;
  key_points: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** 会員向け API 応答。preview=1 時は is_published も含む */
export type DrillItemPublic = Pick<
  DrillItem,
  | 'id'
  | 'stroke'
  | 'title'
  | 'youtube_video_id'
  | 'overview'
  | 'key_points'
  | 'sort_order'
  | 'created_at'
  | 'updated_at'
> & { is_published?: boolean };

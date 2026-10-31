export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface TopicTag {
  name: string;
  slug: string;
}

export interface LeetCodeQuestion {
  frontendQuestionId: string;
  title: string;
  titleSlug: string;
  difficulty: Difficulty;
  topicTags: TopicTag[];
  paidOnly: boolean;
}

export interface RatingRecord {
  ID: number;
  Title: string;
  TitleSlug: string;
  Rating: number;
}

export interface Problem extends LeetCodeQuestion {
  rating: number | null;
}

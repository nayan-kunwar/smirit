export interface UserProfile {
  skills: string[];
  interests: string[];
  summary?: string;
}

export interface UserProfileDTO {
  userId: string;
  profile: UserProfile;
  updatedAt: string;
}

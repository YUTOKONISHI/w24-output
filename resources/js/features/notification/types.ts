export type NotificationLog = {
  id: number;
  title: string;
  description: string;
  status: 'unread' | 'read';
  created_at: string;
};

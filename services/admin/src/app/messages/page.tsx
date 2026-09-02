import { MessagesView } from "@/views/messages";

interface MessagesPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const MessagesPage = ({ searchParams }: MessagesPageProps) => (
  <MessagesView searchParams={searchParams} />
);

export default MessagesPage;

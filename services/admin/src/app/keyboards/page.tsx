import { KeyboardsView } from "@/views/keyboards";

interface KeyboardsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const KeyboardsPage = ({ searchParams }: KeyboardsPageProps) => (
  <KeyboardsView searchParams={searchParams} />
);

export default KeyboardsPage;

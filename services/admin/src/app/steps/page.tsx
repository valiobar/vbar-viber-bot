import { StepsView } from "@/views/steps";

interface StepsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const StepsPage = ({ searchParams }: StepsPageProps) => (
  <StepsView searchParams={searchParams} />
);

export default StepsPage;

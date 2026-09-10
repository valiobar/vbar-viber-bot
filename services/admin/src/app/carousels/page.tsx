import { CarouselsView } from "@/views/carousels";

interface CarouselsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const CarouselsPage = ({ searchParams }: CarouselsPageProps) => (
  <CarouselsView searchParams={searchParams} />
);

export default CarouselsPage;

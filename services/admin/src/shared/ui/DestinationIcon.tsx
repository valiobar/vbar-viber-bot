type DestinationIconProps = {
  className?: string;
};

export const DestinationIcon = ({
  className = "h-4 w-4",
}: DestinationIconProps) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M21.71 11.29 12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 0 1.42l9 9a1 1 0 0 0 1.42 0l9-9a1 1 0 0 0 0-1.42ZM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5L17.5 11 14 14.5Z" />
  </svg>
);

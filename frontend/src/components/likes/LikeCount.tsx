interface LikeCountProps {
  count: number;
  className?: string;
}

export function LikeCount({ count, className }: LikeCountProps) {
  if (count === 0) return null;

  return (
    <span className={className}>
      {count} {count === 1 ? 'like' : 'likes'}
    </span>
  );
}

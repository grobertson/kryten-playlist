import { useNavigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <FileQuestion className="mx-auto h-16 w-16 text-text-subdued" />
        <h1 className="mt-4 text-2xl font-bold text-text">Page Not Found</h1>
        <p className="mt-2 text-text-muted">
          The page you're looking for doesn't exist.
        </p>
        <Button
          onClick={() => navigate('/')}
          variant="secondary"
          className="mt-6"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

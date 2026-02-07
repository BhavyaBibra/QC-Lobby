'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen bg-black items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-white text-2xl font-bold">Something went wrong!</h2>
        <p className="text-gray-400">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

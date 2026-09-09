"use client";
export default function Error({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="p-4">
      <p className="text-neutral-600">Something went wrong.</p>
      {/* <button onClick={() => retry()}>Try again</button> */}
    </div>
  );
}
import ImportWithProgress from "@/features/config-import/ImportWithProgress";

export default function OverviewPage() {
  return (
    <main className="w-full h-[calc(100vh-64px)] flex items-center justify-center">
      <ImportWithProgress />
    </main>
  );
}

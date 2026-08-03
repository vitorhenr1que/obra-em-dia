import PublicPortal from "./public-portal";

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicPortal token={token} />;
}

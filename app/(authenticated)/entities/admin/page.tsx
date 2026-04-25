import EntityDirectory from "@/components/matrx/Entity/EntityDirectory";

export default function EntityCrudPage() {
  return (
    <div className="p-4">
      <EntityDirectory route="/entities/admin" showPretty={false} />
    </div>
  );
}

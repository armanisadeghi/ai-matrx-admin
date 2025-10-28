import { OrganizationList } from "@/features/organizations";

export default function OrganizationsPage() {
    return (
        <div className="h-full w-full bg-textured">
            <div className="p-8 md:p-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Organizations
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage your organizations and team collaboration
                    </p>
                </div>

                <OrganizationList />
            </div>
        </div>
    );
}


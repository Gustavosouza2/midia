import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardIcon } from "../icons/dashboard-icon";
import { Breadcrumb } from "../breadcrumb";

export function DashboardBreadcrumb() {
  return (
    <Breadcrumb Icon={DashboardIcon} title="Painel">
      <Button asChild>
        <Link transitionTypes={["screen"]} href="/sales">
          <Plus className="size-3.5" />
          Nova venda
        </Link>
      </Button>
    </Breadcrumb>
  );
}

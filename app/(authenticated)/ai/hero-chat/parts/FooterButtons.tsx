"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Icon } from "@iconify/react";

export default function FooterButtons() {
  return (
    <div className="mt-auto flex flex-col">
      <Button
        fullWidth
        className="justify-start text-default-600"
        startContent={
          <Icon className="text-default-600" icon="solar:info-circle-line-duotone" width={24} />
        }
        variant="light"
      >
        Help
      </Button>
      <Button
        className="justify-start text-default-600"
        startContent={
          <Icon className="text-default-600" icon="solar:history-line-duotone" width={24} />
        }
        variant="light"
      >
        Activity
      </Button>
      <Button
        className="justify-start text-default-600"
        startContent={
          <Icon
            className="text-default-600"
            icon="solar:settings-minimalistic-line-duotone"
            width={24}
          />
        }
        variant="light"
      >
        Settings
      </Button>
    </div>
  );
}
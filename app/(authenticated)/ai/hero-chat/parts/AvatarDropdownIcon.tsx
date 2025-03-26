import { ComponentProps } from "react";

export function AvatarDropdownIcon(props: ComponentProps<"svg">) {
    return (
      <svg
        {...props}
        fill="none"
        height="20"
        viewBox="0 0 20 20"
        width="20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_3076_10614)">
          <path
            d="M6.6665 7.50008L9.99984 4.16675L13.3332 7.50008"
            stroke="#A1A1AA"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.3332 12.5L9.99984 15.8333L6.6665 12.5"
            stroke="#A1A1AA"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <clipPath id="clip0_3076_10614">
            <rect fill="white" height="20" width="20" />
          </clipPath>
        </defs>
      </svg>
    );
  }
  
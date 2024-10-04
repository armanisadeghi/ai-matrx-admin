import {
    FlaskConical,
    Home,
    Settings,
    SquareFunction,
    Users,
    CreditCard,
    Camera,
    Palette,
    Table,
    Type,
    Maximize,
    FileInput,
    Image,
    Sliders,
    Video,
    Edit3
  } from "lucide-react";
  import React from "react";

  export const appSidebarLinks = [
      {
          label: 'Home',
          href: '/dashboard',
          icon: (
              <Home className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Users',
          href: '/dashboard/users',
          icon: (
              <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Settings',
          href: '/dashboard/settings',
          icon: (
              <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Manage Admin Functions',
          href: '/admin/registered-functions',
          icon: (
              <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Developer Tests',
          href: '/tests',
          icon: (
              <FlaskConical className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'AI Playground',
          href: '/playground',
          icon: (
              <SquareFunction className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Flash Cards',
          href: '/flash-cards',
          icon: (
              <CreditCard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Camera',
          href: '/tests/camera-test',
          icon: (
              <Camera className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Color Swatches',
          href: '/tests/color-swatches',
          icon: (
              <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'InteliTable',
          href: '/tests/table-test',
          icon: (
              <Table className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Rich Text Editor',
          href: '/tests/rich-text-editor',
          icon: (
              <Type className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Full Screen Demo',
          href: '/tests/full-screen-demo',
          icon: (
              <Maximize className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Animated Form',
          href: '/tests/animated-form',
          icon: (
              <FileInput className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Image Gallery',
          href: '/tests/image-gallery-starter',
          icon: (
              <Image className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Floating Slider',
          href: '/tests/floating-slider-demo',
          icon: (
              <Sliders className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Video Conference',
          href: '/meetings',
          icon: (
              <Video className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
      {
          label: 'Image Editing',
          href: '/image-editing',
          icon: (
              <Edit3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0"/>
          ),
      },
  ];

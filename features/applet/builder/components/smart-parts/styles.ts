import { COLOR_VARIANTS } from "@/features/applet/layouts/helpers/StyledComponents";
import { CustomAppConfig, CustomAppletConfig } from "../../builder.types";


export const getFieldComponentStyle = (componentType: string) => {
    const types = {
        text: {
            bg: "bg-blue-100 dark:bg-blue-900/30",
            text: "text-blue-700 dark:text-blue-300",
            border: "border-blue-200 dark:border-blue-800",
        },
        number: {
            bg: "bg-amber-100 dark:bg-amber-900/30",
            text: "text-amber-700 dark:text-amber-300",
            border: "border-amber-200 dark:border-amber-800",
        },
        select: {
            bg: "bg-purple-100 dark:bg-purple-900/30",
            text: "text-purple-700 dark:text-purple-300",
            border: "border-purple-200 dark:border-purple-800",
        },
        checkbox: {
            bg: "bg-green-100 dark:bg-green-900/30",
            text: "text-green-700 dark:text-green-300",
            border: "border-green-200 dark:border-green-800",
        },
        radio: {
            bg: "bg-red-100 dark:bg-red-900/30",
            text: "text-red-700 dark:text-red-300",
            border: "border-red-200 dark:border-red-800",
        },
        date: {
            bg: "bg-indigo-100 dark:bg-indigo-900/30",
            text: "text-indigo-700 dark:text-indigo-300",
            border: "border-indigo-200 dark:border-indigo-800",
        },
        textarea: {
            bg: "bg-teal-100 dark:bg-teal-900/30",
            text: "text-teal-700 dark:text-teal-300",
            border: "border-teal-200 dark:border-teal-800",
        },
        toggle: {
            bg: "bg-pink-100 dark:bg-pink-900/30",
            text: "text-pink-700 dark:text-pink-300",
            border: "border-pink-200 dark:border-pink-800",
        },
        file: {
            bg: "bg-orange-100 dark:bg-orange-900/30",
            text: "text-orange-700 dark:text-orange-300",
            border: "border-orange-200 dark:border-orange-800",
        },
        richtext: {
            bg: "bg-cyan-100 dark:bg-cyan-900/30",
            text: "text-cyan-700 dark:text-cyan-300",
            border: "border-cyan-200 dark:border-cyan-800",
        },
        multiselect: {
            bg: "bg-violet-100 dark:bg-violet-900/30",
            text: "text-violet-700 dark:text-violet-300",
            border: "border-violet-200 dark:border-violet-800",
        },
        slider: {
            bg: "bg-lime-100 dark:bg-lime-900/30",
            text: "text-lime-700 dark:text-lime-300",
            border: "border-lime-200 dark:border-lime-800",
        },
        signature: {
            bg: "bg-rose-100 dark:bg-rose-900/30",
            text: "text-rose-700 dark:text-rose-300",
            border: "border-rose-200 dark:border-rose-800",
        },
        calendar: {
            bg: "bg-sky-100 dark:bg-sky-900/30",
            text: "text-sky-700 dark:text-sky-300",
            border: "border-sky-200 dark:border-sky-800",
        },
        autocomplete: {
            bg: "bg-emerald-100 dark:bg-emerald-900/30",
            text: "text-emerald-700 dark:text-emerald-300",
            border: "border-emerald-200 dark:border-emerald-800",
        },
        color: {
            bg: "bg-fuchsia-100 dark:bg-fuchsia-900/30",
            text: "text-fuchsia-700 dark:text-fuchsia-300",
            border: "border-fuchsia-200 dark:border-fuchsia-800",
        },
    };

    // Default to a neutral color if the component type isn't recognized
    return (
        types[componentType.toLowerCase()] || {
            bg: "bg-gray-100 dark:bg-gray-900/30",
            text: "text-gray-700 dark:text-gray-300",
            border: "border-gray-200 dark:border-gray-800",
        }
    );
};



  // Get color classes based on applet's primary color
  export const getAppletColorClasses = (applet: CustomAppletConfig, viewMode: string) => {
    const color = applet.primaryColor || 'emerald';
    
    // Default text and card background colors
    const defaultTextClass = 'text-gray-900 dark:text-gray-100';
    const defaultCardBg = 'bg-white dark:bg-gray-800';
    const defaultCardFooterBg = 'bg-gray-50 dark:bg-gray-800';
    const defaultDescriptionClass = 'text-gray-600 dark:text-gray-300';
    
    // If we're using banner images, don't colorize
    if (viewMode === 'grid' && applet.imageUrl) {
      return {
        cardBg: defaultCardBg,
        cardFooterBg: defaultCardFooterBg,
        titleClass: defaultTextClass,
        descriptionClass: defaultDescriptionClass,
      };
    }
    // If card has primaryColor, use that color's background variant
    if (color && COLOR_VARIANTS.background[color]) {
      // For light colored backgrounds, use dark text and vice versa
      const isDarkColor = [
        'blue', 'green', 'purple', 'red', 'slate', 'zinc', 'neutral', 
        'stone', 'emerald', 'teal', 'cyan', 'sky', 'violet', 'fuchsia'
      ].includes(color);
      
      const isVeryLightColor = ['white', 'gray'].includes(color);
      
      // Apply bg-{color}-100 for light mode and bg-{color}-900 for dark mode
      // NOTE: Using these specific classes to ensure they're included in the Tailwind bundle
      let cardBgClass;
      
      switch (color) {
        case 'gray': cardBgClass = 'bg-gray-100 dark:bg-gray-900'; break;
        case 'rose': cardBgClass = 'bg-rose-100 dark:bg-rose-900'; break;
        case 'blue': cardBgClass = 'bg-blue-100 dark:bg-blue-900'; break;
        case 'green': cardBgClass = 'bg-green-100 dark:bg-green-900'; break;
        case 'purple': cardBgClass = 'bg-purple-100 dark:bg-purple-900'; break;
        case 'yellow': cardBgClass = 'bg-yellow-100 dark:bg-yellow-900'; break;
        case 'red': cardBgClass = 'bg-red-100 dark:bg-red-900'; break;
        case 'orange': cardBgClass = 'bg-orange-100 dark:bg-orange-900'; break;
        case 'pink': cardBgClass = 'bg-pink-100 dark:bg-pink-900'; break;
        case 'slate': cardBgClass = 'bg-slate-100 dark:bg-slate-900'; break;
        case 'zinc': cardBgClass = 'bg-zinc-100 dark:bg-zinc-900'; break;
        case 'neutral': cardBgClass = 'bg-neutral-100 dark:bg-neutral-900'; break;
        case 'stone': cardBgClass = 'bg-stone-100 dark:bg-stone-900'; break;
        case 'amber': cardBgClass = 'bg-amber-100 dark:bg-amber-900'; break;
        case 'lime': cardBgClass = 'bg-lime-100 dark:bg-lime-900'; break;
        case 'emerald': cardBgClass = 'bg-emerald-100 dark:bg-emerald-900'; break;
        case 'teal': cardBgClass = 'bg-teal-100 dark:bg-teal-900'; break;
        case 'cyan': cardBgClass = 'bg-cyan-100 dark:bg-cyan-900'; break;
        case 'sky': cardBgClass = 'bg-sky-100 dark:bg-sky-900'; break;
        case 'violet': cardBgClass = 'bg-violet-100 dark:bg-violet-900'; break;
        case 'fuchsia': cardBgClass = 'bg-fuchsia-100 dark:bg-fuchsia-900'; break;
        default: cardBgClass = defaultCardBg;
      }
      
      // For footer, use a slightly darker shade
      let cardFooterBgClass;
      
      switch (color) {
        case 'gray': cardFooterBgClass = 'bg-gray-200 dark:bg-gray-800'; break;
        case 'rose': cardFooterBgClass = 'bg-rose-200 dark:bg-rose-800'; break;
        case 'blue': cardFooterBgClass = 'bg-blue-200 dark:bg-blue-800'; break;
        case 'green': cardFooterBgClass = 'bg-green-200 dark:bg-green-800'; break;
        case 'purple': cardFooterBgClass = 'bg-purple-200 dark:bg-purple-800'; break;
        case 'yellow': cardFooterBgClass = 'bg-yellow-200 dark:bg-yellow-800'; break;
        case 'red': cardFooterBgClass = 'bg-red-200 dark:bg-red-800'; break;
        case 'orange': cardFooterBgClass = 'bg-orange-200 dark:bg-orange-800'; break;
        case 'pink': cardFooterBgClass = 'bg-pink-200 dark:bg-pink-800'; break;
        case 'slate': cardFooterBgClass = 'bg-slate-200 dark:bg-slate-800'; break;
        case 'zinc': cardFooterBgClass = 'bg-zinc-200 dark:bg-zinc-800'; break;
        case 'neutral': cardFooterBgClass = 'bg-neutral-200 dark:bg-neutral-800'; break;
        case 'stone': cardFooterBgClass = 'bg-stone-200 dark:bg-stone-800'; break;
        case 'amber': cardFooterBgClass = 'bg-amber-200 dark:bg-amber-800'; break;
        case 'lime': cardFooterBgClass = 'bg-lime-200 dark:bg-lime-800'; break;
        case 'emerald': cardFooterBgClass = 'bg-emerald-200 dark:bg-emerald-800'; break;
        case 'teal': cardFooterBgClass = 'bg-teal-200 dark:bg-teal-800'; break;
        case 'cyan': cardFooterBgClass = 'bg-cyan-200 dark:bg-cyan-800'; break;
        case 'sky': cardFooterBgClass = 'bg-sky-200 dark:bg-sky-800'; break;
        case 'violet': cardFooterBgClass = 'bg-violet-200 dark:bg-violet-800'; break;
        case 'fuchsia': cardFooterBgClass = 'bg-fuchsia-200 dark:bg-fuchsia-800'; break;
        default: cardFooterBgClass = defaultCardFooterBg;
      }
      
      // Determine text color based on background
      const titleClass = isVeryLightColor 
        ? 'text-gray-900 dark:text-white'
        : !isDarkColor 
          ? 'text-gray-900 dark:text-white' 
          : 'text-white dark:text-white';
          
      const descriptionClass = isVeryLightColor
        ? 'text-gray-600 dark:text-gray-300'
        : !isDarkColor
          ? 'text-gray-700 dark:text-gray-200'
          : 'text-gray-100 dark:text-gray-200';
      
      return {
        cardBg: cardBgClass,
        cardFooterBg: cardFooterBgClass,
        titleClass,
        descriptionClass,
      };
    }
    
    // Default fallback
    return {
      cardBg: defaultCardBg,
      cardFooterBg: defaultCardFooterBg,
      titleClass: defaultTextClass,
      descriptionClass: defaultDescriptionClass,
    };
  };


  export const getAppColorClasses = (app: CustomAppConfig, viewMode: string) => {
    const color = app.primaryColor || 'gray';
    
    // Default text and card background colors
    const defaultTextClass = 'text-gray-900 dark:text-gray-100';
    const defaultCardBg = 'bg-white dark:bg-gray-800';
    const defaultCardFooterBg = 'bg-gray-50 dark:bg-gray-800';
    const defaultDescriptionClass = 'text-gray-600 dark:text-gray-300';
    
    // If we're using banner images, don't colorize
    if (viewMode === 'grid' && app.imageUrl) {
      return {
        cardBg: defaultCardBg,
        cardFooterBg: defaultCardFooterBg,
        titleClass: defaultTextClass,
        descriptionClass: defaultDescriptionClass,
      };
    }

    // If card has primaryColor, use that color's background variant
    if (color && COLOR_VARIANTS.background[color]) {
      // For light colored backgrounds, use dark text and vice versa
      const isDarkColor = [
        'blue', 'green', 'purple', 'red', 'slate', 'zinc', 'neutral', 
        'stone', 'emerald', 'teal', 'cyan', 'sky', 'violet', 'fuchsia'
      ].includes(color);
      
      const isVeryLightColor = ['white', 'gray'].includes(color);
      
      // Apply bg-{color}-100 for light mode and bg-{color}-900 for dark mode
      // NOTE: Using these specific classes to ensure they're included in the Tailwind bundle
      let cardBgClass;
      
      switch (color) {
        case 'gray': cardBgClass = 'bg-gray-100 dark:bg-gray-900'; break;
        case 'rose': cardBgClass = 'bg-rose-100 dark:bg-rose-900'; break;
        case 'blue': cardBgClass = 'bg-blue-100 dark:bg-blue-900'; break;
        case 'green': cardBgClass = 'bg-green-100 dark:bg-green-900'; break;
        case 'purple': cardBgClass = 'bg-purple-100 dark:bg-purple-900'; break;
        case 'yellow': cardBgClass = 'bg-yellow-100 dark:bg-yellow-900'; break;
        case 'red': cardBgClass = 'bg-red-100 dark:bg-red-900'; break;
        case 'orange': cardBgClass = 'bg-orange-100 dark:bg-orange-900'; break;
        case 'pink': cardBgClass = 'bg-pink-100 dark:bg-pink-900'; break;
        case 'slate': cardBgClass = 'bg-slate-100 dark:bg-slate-900'; break;
        case 'zinc': cardBgClass = 'bg-zinc-100 dark:bg-zinc-900'; break;
        case 'neutral': cardBgClass = 'bg-neutral-100 dark:bg-neutral-900'; break;
        case 'stone': cardBgClass = 'bg-stone-100 dark:bg-stone-900'; break;
        case 'amber': cardBgClass = 'bg-amber-100 dark:bg-amber-900'; break;
        case 'lime': cardBgClass = 'bg-lime-100 dark:bg-lime-900'; break;
        case 'emerald': cardBgClass = 'bg-emerald-100 dark:bg-emerald-900'; break;
        case 'teal': cardBgClass = 'bg-teal-100 dark:bg-teal-900'; break;
        case 'cyan': cardBgClass = 'bg-cyan-100 dark:bg-cyan-900'; break;
        case 'sky': cardBgClass = 'bg-sky-100 dark:bg-sky-900'; break;
        case 'violet': cardBgClass = 'bg-violet-100 dark:bg-violet-900'; break;
        case 'fuchsia': cardBgClass = 'bg-fuchsia-100 dark:bg-fuchsia-900'; break;
        default: cardBgClass = defaultCardBg;
      }
      
      // For footer, use a slightly darker shade
      let cardFooterBgClass;
      
      switch (color) {
        case 'gray': cardFooterBgClass = 'bg-gray-200 dark:bg-gray-800'; break;
        case 'rose': cardFooterBgClass = 'bg-rose-200 dark:bg-rose-800'; break;
        case 'blue': cardFooterBgClass = 'bg-blue-200 dark:bg-blue-800'; break;
        case 'green': cardFooterBgClass = 'bg-green-200 dark:bg-green-800'; break;
        case 'purple': cardFooterBgClass = 'bg-purple-200 dark:bg-purple-800'; break;
        case 'yellow': cardFooterBgClass = 'bg-yellow-200 dark:bg-yellow-800'; break;
        case 'red': cardFooterBgClass = 'bg-red-200 dark:bg-red-800'; break;
        case 'orange': cardFooterBgClass = 'bg-orange-200 dark:bg-orange-800'; break;
        case 'pink': cardFooterBgClass = 'bg-pink-200 dark:bg-pink-800'; break;
        case 'slate': cardFooterBgClass = 'bg-slate-200 dark:bg-slate-800'; break;
        case 'zinc': cardFooterBgClass = 'bg-zinc-200 dark:bg-zinc-800'; break;
        case 'neutral': cardFooterBgClass = 'bg-neutral-200 dark:bg-neutral-800'; break;
        case 'stone': cardFooterBgClass = 'bg-stone-200 dark:bg-stone-800'; break;
        case 'amber': cardFooterBgClass = 'bg-amber-200 dark:bg-amber-800'; break;
        case 'lime': cardFooterBgClass = 'bg-lime-200 dark:bg-lime-800'; break;
        case 'emerald': cardFooterBgClass = 'bg-emerald-200 dark:bg-emerald-800'; break;
        case 'teal': cardFooterBgClass = 'bg-teal-200 dark:bg-teal-800'; break;
        case 'cyan': cardFooterBgClass = 'bg-cyan-200 dark:bg-cyan-800'; break;
        case 'sky': cardFooterBgClass = 'bg-sky-200 dark:bg-sky-800'; break;
        case 'violet': cardFooterBgClass = 'bg-violet-200 dark:bg-violet-800'; break;
        case 'fuchsia': cardFooterBgClass = 'bg-fuchsia-200 dark:bg-fuchsia-800'; break;
        default: cardFooterBgClass = defaultCardFooterBg;
      }
      
      // Determine text color based on background
      const titleClass = isVeryLightColor 
        ? 'text-gray-900 dark:text-white'
        : !isDarkColor 
          ? 'text-gray-900 dark:text-white' 
          : 'text-white dark:text-white';
          
      const descriptionClass = isVeryLightColor
        ? 'text-gray-600 dark:text-gray-300'
        : !isDarkColor
          ? 'text-gray-700 dark:text-gray-200'
          : 'text-gray-100 dark:text-gray-200';
      
      return {
        cardBg: cardBgClass,
        cardFooterBg: cardFooterBgClass,
        titleClass,
        descriptionClass,
      };
    }
    
    // Default fallback
    return {
      cardBg: defaultCardBg,
      cardFooterBg: defaultCardFooterBg,
      titleClass: defaultTextClass,
      descriptionClass: defaultDescriptionClass,
    };
  };

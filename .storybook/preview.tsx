import type { Decorator, Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";

/**
 * tickd's light/dark themes are switched via `data-theme` on a wrapping
 * element (see ThemeProvider in src/components/theme-provider.tsx, which
 * sets it on <html> at app scope) - globals.css reads that attribute, not
 * a media query, so stories need the same attribute rather than relying on
 * prefers-color-scheme. The toolbar item below drives it per story.
 */
const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme ?? "light";
  return (
    <div data-theme={theme === "dark" ? "dark" : undefined} className="bg-bg text-text p-6">
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },

    backgrounds: {
      disable: true,
    },
  },

  globalTypes: {
    theme: {
      description: "tickd color theme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    theme: "light",
  },

  decorators: [withTheme],
};

export default preview;

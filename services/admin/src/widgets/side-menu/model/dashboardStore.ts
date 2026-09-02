/**
 * Dashboard Store
 *
 * Manages dashboard navigation state and tool configuration.
 * Provides tools array with route paths for sidebar navigation.
 */

/**
 * Tool interface for dashboard navigation items
 */
export interface Tool {
  id: string;
  label: string;
  route: string;
  icon?: string;
}

/**
 * Default tools for dashboard navigation
 */
export const DEFAULT_TOOLS: Tool[] = [
  {
    id: "settings",
    label: "Settings",
    route: "/settings",
  },
  {
    id: "overview",
    label: "Overview",
    route: "/overview",
  },
  {
    id: "users",
    label: "Users",
    route: "/users",
  },
  {
    id: "keyboards",
    label: "Keyboards",
    route: "/keyboards",
  },
  {
    id: "messages",
    label: "Messages",
    route: "/messages",
  },
  {
    id: "steps",
    label: "Steps",
    route: "/steps",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    route: "/knowledge-base",
  },
  {
    id: "analytics",
    label: "Analytics",
    route: "/analytics",
  },
];

/**
 * Get tool by route path
 *
 * @param route - Route path to find tool for
 * @returns Tool object or undefined if not found
 */
export const getToolByRoute = (route: string): Tool | undefined => {
  return DEFAULT_TOOLS.find((tool) => tool.route === route);
};

/**
 * Get tool by ID
 *
 * @param id - Tool ID to find
 * @returns Tool object or undefined if not found
 */
export const getToolById = (id: string): Tool | undefined => {
  return DEFAULT_TOOLS.find((tool) => tool.id === id);
};


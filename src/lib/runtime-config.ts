const normalizeBasePath = (value?: string) => {
  if (!value || value === "/") {
    return "";
  }

  const trimmed = value.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/g, "");

export const getBasePath = () => normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export const withBasePath = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const basePath = getBasePath();

  if (!basePath) {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `${basePath}/` : `${basePath}${normalizedPath}`;
};

export const stripBasePath = (pathname: string) => {
  const basePath = getBasePath();

  if (!basePath || !pathname.startsWith(basePath)) {
    return pathname;
  }

  const strippedPath = pathname.slice(basePath.length);
  return strippedPath || "/";
};

export const getGraphqlUrl = () => {
  const explicitGraphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL?.trim();

  if (explicitGraphqlUrl) {
    return explicitGraphqlUrl;
  }

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").trim();
  return apiUrl.endsWith("/graphql") ? apiUrl : `${trimTrailingSlash(apiUrl)}/graphql`;
};

export const getBackendBaseUrl = () => {
  const explicitBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  if (explicitBackendUrl) {
    return trimTrailingSlash(explicitBackendUrl);
  }

  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").trim();
  return apiUrl.endsWith("/graphql")
    ? apiUrl.slice(0, -"/graphql".length)
    : trimTrailingSlash(apiUrl);
};

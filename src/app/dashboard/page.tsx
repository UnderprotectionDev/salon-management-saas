"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const Page = () => {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) {
    return <div>Loading...</div>;
  }

  if (user === null) {
    return <div>Unauthorized</div>;
  }

  return (
    <div>
      <pre>{JSON.stringify(user, null, 2)}</pre>
    </div>
  );
};

export default Page;

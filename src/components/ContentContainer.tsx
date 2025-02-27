import { FC } from "react";
import Link from "next/link";
export const ContentContainer: FC = (props) => {
  return (
    <div className="flex-1 drawer h-52 bg-slate-100">
      <input id="my-drawer" type="checkbox" className="grow drawer-toggle" />
      <div className="items-center  drawer-content">{props.children}</div>
    </div>
  );
};

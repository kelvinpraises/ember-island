"use client";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { ColoredSummary } from "@/components/colored-summary";
import { PFP } from "@/components/pfp";
import { ActivityEvent } from "@/hooks/use-activity-feed";

dayjs.extend(relativeTime);

type Props = {
  index: number;
  event: ActivityEvent;
};

export function ActivityEventRow({ index, event }: Props) {
  return (
    <div key={index} className="flex flex-col py-3 hover:bg-[#2A2440] transition-colors rounded-lg px-2">
      <div className="flex flex-row items-center w-full mb-2 text-left">
        <div className="flex-shrink-0 w-12 h-12 transition-transform hover:scale-110">
          <PFP pfp={event.player.pfp} size={48} />
        </div>
        <div className="flex-1 min-w-0 ml-3">
          <span className="flex flex-wrap items-center gap-1">
            <span className="text-[#FF6B35] whitespace-nowrap font-bold text-lg">
              @{event.player.username}
            </span>
            <span className="ml-2 text-gray-400 whitespace-nowrap text-xs">
              {dayjs.unix(event.eventTime).fromNow()}
            </span>
          </span>
          <span className="break-words text-sm mt-1 block">
            <ColoredSummary summary={event.description} />
          </span>
        </div>
      </div>
      <div className="h-px bg-[#FF6B35] opacity-30 mb-1" />
    </div>
  );
}


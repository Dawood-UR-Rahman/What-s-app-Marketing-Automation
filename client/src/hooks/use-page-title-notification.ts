import { useEffect, useRef } from "react";

export function usePageTitleNotification(hasNewMessages: boolean, count?: number) {
  const originalTitleRef = useRef<string>(document.title);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    originalTitleRef.current = document.title;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.title = originalTitleRef.current;
    };
  }, []);

  useEffect(() => {
    if (hasNewMessages) {
      let toggle = false;
      const notificationText = count && count > 0 
        ? `(${count}) New Message${count > 1 ? 's' : ''}`
        : "New Message";

      intervalRef.current = setInterval(() => {
        toggle = !toggle;
        document.title = toggle ? notificationText : originalTitleRef.current;
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.title = originalTitleRef.current;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hasNewMessages, count]);

  return {
    resetTitle: () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.title = originalTitleRef.current;
    },
  };
}

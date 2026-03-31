'use client';

import * as React from 'react';
import {
  Command as Cmd,
  CommandInput as CmdInput,
  CommandList as CmdList,
  CommandEmpty as CmdEmpty,
  CommandGroup as CmdGroup,
  CommandItem as CmdItem,
  CommandSeparator as CmdSeparator,
} from 'cmdk';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/dialog';

const Command = Cmd;

const CommandDialog = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog>) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 glass">
        <Command className="flex flex-col overflow-hidden bg-transparent">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CmdInput>,
  React.ComponentPropsWithoutRef<typeof CmdInput>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b border-border px-3">
    <Search className="mr-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
    <CmdInput
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
    <div className="ml-2 flex items-center gap-1 text-xs text-muted">
      <kbd className="rounded border border-border bg-surface px-1.5 font-mono">⌘</kbd>
      <span>+</span>
      <kbd className="rounded border border-border bg-surface px-1.5 font-mono">K</kbd>
    </div>
  </div>
));
CommandInput.displayName = CmdInput.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CmdList>,
  React.ComponentPropsWithoutRef<typeof CmdList>
>(({ className, ...props }, ref) => (
  <CmdList
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden py-2', className)}
    {...props}
  />
));
CommandList.displayName = CmdList.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CmdEmpty>,
  React.ComponentPropsWithoutRef<typeof CmdEmpty>
>((props, ref) => (
  <CmdEmpty
    ref={ref}
    className="py-6 text-center text-sm text-muted"
    {...props}
  />
));
CommandEmpty.displayName = CmdEmpty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CmdGroup>,
  React.ComponentPropsWithoutRef<typeof CmdGroup> & { heading?: string }
>(({ className, heading, children, ...props }, ref) => (
  <CmdGroup
    ref={ref}
    className={cn('overflow-hidden px-1 py-1', className)}
    {...props}
  >
    {heading && (
      <div className="px-2 py-1.5 text-xs font-medium text-muted">
        {heading}
      </div>
    )}
    {children}
  </CmdGroup>
));
CommandGroup.displayName = CmdGroup.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CmdSeparator>,
  React.ComponentPropsWithoutRef<typeof CmdSeparator>
>(({ className, ...props }, ref) => (
  <CmdSeparator
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
));
CommandSeparator.displayName = CmdSeparator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CmdItem>,
  React.ComponentPropsWithoutRef<typeof CmdItem>
>(({ className, ...props }, ref) => (
  <CmdItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
      'aria-selected:bg-surface-hover aria-selected:text-fg',
      'hover:bg-surface-hover',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = CmdItem.displayName;

const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'ml-auto flex items-center gap-1 text-xs text-muted',
        className
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};

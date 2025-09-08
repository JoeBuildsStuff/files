
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { SquarePen, Command, ArrowBigUp, Search, Image } from "lucide-react"
import { SidebarLogo } from "./app-sidebar-logo"
import { AuthButton } from "@/components/auth-button"
import { ModeToggle } from "./mode-toggle"

export function AppSidebar() {


  return (
    <>
      <Sidebar>
        <SidebarHeader className="">
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent className="flex flex-col">
          {/* Quick Actions */}
          <SidebarGroup>
            {/* <SidebarGroupLabel>Quick Actions</SidebarGroupLabel> */}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="space-y-1">
                    {/* New chat */}
                    <SidebarMenuButton className="w-full justify-between group">
                      <div className="flex items-center gap-2">
                        <SquarePen className="size-4 flex-none" />
                        <span className="text-sm">New chat</span>
                      </div>
                      <div className="gap-1 inline-flex whitespace-pre text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <kbd aria-label="Shift"><ArrowBigUp className="size-3" /></kbd>
                        <kbd aria-label="Command"><Command className="size-3" /></kbd>
                        <kbd aria-label="N" className="size-3 flex items-center justify-center"><span className="text-sm">N</span></kbd>
                      </div>
                    </SidebarMenuButton>

                    {/* Search chats */}
                    <SidebarMenuButton className="w-full justify-between group">
                      <div className="flex items-center gap-2">
                        <Search className="size-4 flex-none" />
                        <span className="text-sm">Search chats</span>
                      </div>
                      <div className="gap-1 inline-flex whitespace-pre text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <kbd aria-label="Command"><Command className="size-3" /></kbd>
                        <kbd aria-label="K" className="size-3 flex items-center justify-center"><span className="text-sm">K</span></kbd>
                      </div>
                    </SidebarMenuButton>

                    {/* Image library */}
                    <SidebarMenuButton className="w-full justify-between group">
                      <div className="flex items-center gap-2">
                        <Image className="size-4 flex-none" />
                        <span className="text-sm">Image library</span>
                      </div>
                      {/* No keyboard shortcut for now, but you can add if desired */}
                    </SidebarMenuButton>
           
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Recent chats */}
          <SidebarGroup>
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>

              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          
        </SidebarContent>
        <SidebarFooter className="border-t border-border">
          <AuthButton />
        </SidebarFooter>
      </Sidebar>

    </>
  )
}
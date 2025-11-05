
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { LayoutGrid, Images, Share2, Trash2 } from "lucide-react"
import { SidebarLogo } from "./app-sidebar-logo"
import { AuthButton } from "@/components/auth-button"
import Link from "next/link"

export function AppSidebar() {


  return (
    <>
      <Sidebar>
        <SidebarHeader className="">
          <SidebarLogo />
        </SidebarHeader>
        <SidebarContent className="flex flex-col">
          {/* Files Navigation */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className="space-y-1">
                    {/* All files */}
                    <SidebarMenuButton asChild>
                      <Link href="/workspace/files" className="w-full">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="size-4 flex-none" />
                          <span className="text-sm">All files</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>

                    {/* Photos */}
                    <SidebarMenuButton asChild>
                      <Link href="/workspace/files/photos" className="w-full">
                        <div className="flex items-center gap-2">
                          <Images className="size-4 flex-none" />
                          <span className="text-sm">Photos</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>

                    {/* Shared */}
                    <SidebarMenuButton asChild>
                      <Link href="/workspace/files/shared" className="w-full">
                        <div className="flex items-center gap-2">
                          <Share2 className="size-4 flex-none" />
                          <span className="text-sm">Shared</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>

                    {/* Deleted files */}
                    <SidebarMenuButton asChild>
                      <Link href="/workspace/files/deleted" className="w-full">
                        <div className="flex items-center gap-2">
                          <Trash2 className="size-4 flex-none" />
                          <span className="text-sm">Deleted files</span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          
        </SidebarContent>
        <SidebarFooter className="">
          <AuthButton />
        </SidebarFooter>
      </Sidebar>

    </>
  )
}
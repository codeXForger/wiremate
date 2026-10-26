import type { ReactNode } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface PanelTab {
  value: string
  label: ReactNode
  content: ReactNode
  className?: string
}

interface PanelTabsProps {
  tabs: PanelTab[]
  trailing?: ReactNode
  /** Set both to choose the open tab from outside; otherwise the first tab opens and the user switches. */
  value?: string
  onValueChange?: (value: string) => void
}

export function PanelTabs({ tabs, trailing, value, onValueChange }: PanelTabsProps) {
  const selection = value === undefined ? { defaultValue: tabs[0]?.value } : { value, onValueChange }
  return (
    <Tabs {...selection} className="flex min-h-0 flex-1 flex-col">
      <PanelTabList tabs={tabs} trailing={trailing} />
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className={tab.className}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}

function PanelTabList({ tabs, trailing }: PanelTabsProps) {
  return (
    <TabsList>
      {tabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value}>
          {tab.label}
        </TabsTrigger>
      ))}
      {trailing}
    </TabsList>
  )
}

import { PagePlaceholder } from '@/features/app/PagePlaceholder'

export function AccountPage() {
  return (
    <PagePlaceholder title="Beállítások">
      <p className="text-muted-foreground">
        Itt tudod majd megváltoztatni a jelszavad és bekapcsolni a kétlépcsős azonosítást.
      </p>
    </PagePlaceholder>
  )
}

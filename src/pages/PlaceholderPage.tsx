export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div className="flex items-center justify-center h-[400px] border-2 border-dashed rounded-lg bg-muted/20">
        <div className="text-center">
          <p className="text-xl font-medium text-muted-foreground">Funcionalidade em desenvolvimento</p>
          <p className="text-sm text-muted-foreground">Esta página fará parte da Fase 3 e posteriores.</p>
        </div>
      </div>
    </div>
  )
}

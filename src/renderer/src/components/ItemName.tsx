/** A request or collection name: long names end in an ellipsis, hovering shows the full name. */
export function ItemName({ name }: { name: string }) {
  return (
    <span title={name} className="min-w-0 truncate">
      {name}
    </span>
  )
}

import { ArrowUp, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react"

type Direction = "straight" | "left" | "right" | "arrived"

interface DirectionIconProps {
  direction: Direction
}

export function DirectionIcon({ direction }: DirectionIconProps) {
  const getIcon = () => {
    switch (direction) {
      case "straight":
        return <ArrowUp className="w-full h-full" strokeWidth={3} />
      case "left":
        return <ArrowLeft className="w-full h-full" strokeWidth={3} />
      case "right":
        return <ArrowRight className="w-full h-full" strokeWidth={3} />
      case "arrived":
        return <CheckCircle className="w-full h-full" strokeWidth={3} />
    }
  }

  const getColor = () => {
    switch (direction) {
      case "straight":
        return "bg-primary text-primary-foreground"
      case "left":
        return "bg-accent text-foreground"
      case "right":
        return "bg-accent text-foreground"
      case "arrived":
        return "bg-primary text-primary-foreground"
    }
  }

  return (
    <div
      className={`w-64 h-64 md:w-96 md:h-96 rounded-3xl shadow-2xl flex items-center justify-center p-12 ${getColor()} animate-pulse`}
      role="img"
      aria-label={`Direction: ${direction}`}
    >
      {getIcon()}
    </div>
  )
}

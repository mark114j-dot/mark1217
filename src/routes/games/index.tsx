import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'

interface Game {
  id: string
  name: string
  description: string
  category: string
  players: number
  playerMode: string
  createdAt: string
}

export const Route = createFileRoute('/games/')() => {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/games')
        if (response.ok) {
          const data = await response.json()
          setGames(data)
        }
      } catch (error) {
        console.error('Error fetching games:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 頭部 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎮 我的遊戲</h1>
            <p className="text-slate-300">管理和創建您的遊戲</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate({ to: '/games/create' })}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
            >
              + 手動創建遊戲
            </Button>
          </div>
        </div>

        {/* 遊戲列表 */}
        {loading ? (
          <div className="text-center text-slate-300">加載中...</div>
        ) : games.length === 0 ? (
          <Card className="bg-slate-900 border-slate-700 text-center py-12">
            <CardContent>
              <p className="text-slate-300 mb-4">還沒有遊戲，開始創建您的第一個遊戲吧！</p>
              <Button
                onClick={() => navigate({ to: '/games/create' })}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                立即創建
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map(game => (
              <Card
                key={game.id}
                className="bg-slate-900 border-slate-700 cursor-pointer hover:border-cyan-500 transition-colors"
                onClick={() => navigate({ to: `/games/${game.id}` })}
              >
                <CardHeader>
                  <CardTitle className="text-white">{game.name}</CardTitle>
                  <CardDescription className="text-slate-400">{game.category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-slate-300 text-sm">{game.description}</p>
                  <div className="flex justify-between text-xs text-slate-400 pt-2">
                    <span>👥 {game.players} 玩家 ({game.playerMode})</span>
                    <span>{new Date(game.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { createFileRoute, useParams } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'

interface Game {
  id: string
  name: string
  description: string
  category: string
  players: number
  playerMode: string
  rules: string
  winCondition: string
  loseCondition: string
  createdAt: string
}

export const Route = createFileRoute('/games/$gameId')() => {
  const { gameId } = useParams({ from: '/games/$gameId' })
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/games/${gameId}`)
        if (response.ok) {
          const data = await response.json()
          setGame(data)
        }
      } catch (error) {
        console.error('Error fetching game:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGame()
  }, [gameId])

  if (loading) {
    return <div className="text-center text-slate-300 pt-8">加載中...</div>
  }

  if (!game) {
    return <div className="text-center text-slate-300 pt-8">遊戲未找到</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* 返回按鈕 */}
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/games' })}
          className="text-slate-300 hover:text-white mb-6"
        >
          ← 返回遊戲列表
        </Button>

        {/* 遊戲詳情 */}
        <Card className="bg-slate-900 border-slate-700 mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-4xl text-white mb-2">{game.name}</CardTitle>
                <CardDescription className="text-slate-300">{game.description}</CardDescription>
              </div>
              <Badge className="bg-cyan-600">{game.category}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
              <div className="bg-slate-800 p-4 rounded">
                <p className="text-slate-400 text-sm">玩家人數</p>
                <p className="text-white text-lg font-semibold">👥 {game.players}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded">
                <p className="text-slate-400 text-sm">遊戲模式</p>
                <p className="text-white text-lg font-semibold">{game.playerMode}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded">
                <p className="text-slate-400 text-sm">創建日期</p>
                <p className="text-white text-sm font-semibold">{new Date(game.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="bg-slate-800 p-4 rounded">
                <p className="text-slate-400 text-sm">狀態</p>
                <p className="text-green-400 text-lg font-semibold">✓ 活躍</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 遊戲規則 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">📋 遊戲規則</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{game.rules}</p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-green-400 text-lg">✅ 勝利條件</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{game.winCondition}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400 text-lg">❌ 失敗條件</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{game.loseCondition}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-4 mt-8">
          <Button
            onClick={() => navigate({ to: `/games/${gameId}/edit` })}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            ✏️ 編輯
          </Button>
          <Button
            onClick={() => navigate({ to: `/games/${gameId}/play` })}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white flex-1"
          >
            🎮 開始遊戲
          </Button>
        </div>
      </div>
    </div>
  )
}

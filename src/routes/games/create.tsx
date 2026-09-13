import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useNavigate } from '@tanstack/react-router'

const GAME_CATEGORIES = [
  { value: 'puzzle', label: '益智遊戲' },
  { value: 'action', label: '動作遊戲' },
  { value: 'strategy', label: '策略遊戲' },
  { value: 'card', label: '卡牌遊戲' },
  { value: 'board', label: '棋盤遊戲' },
  { value: 'other', label: '其他' },
]

const PLAYER_MODES = [
  { value: 'single', label: '單人' },
  { value: 'multiplayer', label: '多人' },
  { value: 'cooperative', label: '合作' },
]

export const Route = createFileRoute('/games/create')() => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    players: 1,
    playerMode: 'single',
    rules: '',
    winCondition: '',
    loseCondition: '',
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 保存遊戲到數據庫
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        const data = await response.json()
        navigate({ to: `/games/${data.id}` })
      }
    } catch (error) {
      console.error('Error creating game:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">🎮 創建新遊戲</CardTitle>
            <CardDescription className="text-slate-300">手動定義您的遊戲規則和玩法</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 遊戲名稱 */}
              <div className="space-y-2">
                <Label className="text-white">遊戲名稱</Label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="輸入遊戲名稱"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-400"
                  required
                />
              </div>

              {/* 遊戲描述 */}
              <div className="space-y-2">
                <Label className="text-white">遊戲描述</Label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="描述您的遊戲概念"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 min-h-[100px]"
                  required
                />
              </div>

              {/* 遊戲分類 */}
              <div className="space-y-2">
                <Label className="text-white">遊戲分類</Label>
                <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {GAME_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-white">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 玩家模式和人數 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">遊戲模式</Label>
                  <Select value={formData.playerMode} onValueChange={(value) => handleSelectChange('playerMode', value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {PLAYER_MODES.map(mode => (
                        <SelectItem key={mode.value} value={mode.value} className="text-white">
                          {mode.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">玩家人數</Label>
                  <Input
                    name="players"
                    type="number"
                    value={formData.players}
                    onChange={handleInputChange}
                    min="1"
                    className="bg-slate-800 border-slate-600 text-white"
                    required
                  />
                </div>
              </div>

              {/* 遊戲規則 */}
              <div className="space-y-2">
                <Label className="text-white">遊戲規則</Label>
                <Textarea
                  name="rules"
                  value={formData.rules}
                  onChange={handleInputChange}
                  placeholder="詳細描述遊戲規則"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 min-h-[120px]"
                  required
                />
              </div>

              {/* 勝利條件 */}
              <div className="space-y-2">
                <Label className="text-white">勝利條件</Label>
                <Textarea
                  name="winCondition"
                  value={formData.winCondition}
                  onChange={handleInputChange}
                  placeholder="玩家如何贏得遊戲"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 min-h-[100px]"
                  required
                />
              </div>

              {/* 失敗條件 */}
              <div className="space-y-2">
                <Label className="text-white">失敗條件</Label>
                <Textarea
                  name="loseCondition"
                  value={formData.loseCondition}
                  onChange={handleInputChange}
                  placeholder="玩家如何失敗或遊戲結束"
                  className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 min-h-[100px]"
                  required
                />
              </div>

              {/* 按鈕 */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
                >
                  {loading ? '創建中...' : '✨ 創建遊戲'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: '/games' })}
                  className="border-slate-600 text-white hover:bg-slate-800"
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

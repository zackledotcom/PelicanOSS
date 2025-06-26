                  {/* Usage Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      title="Daily Active Users"
                      value={Math.floor(analytics.uniqueUsers / 30)}
                      icon={<Users size={20} className="text-blue-500" />}
                      description="unique users/day"
                    />
                    <MetricCard
                      title="Avg Session Length"
                      value={analytics.averageSessionLength}
                      icon={<Clock size={20} className="text-green-500" />}
                      formatValue={(v) => `${v.toFixed(1)} min`}
                    />
                    <MetricCard
                      title="Messages per Session"
                      value={analytics.totalMessages / analytics.totalSessions}
                      icon={<MessageCircle size={20} className="text-purple-500" />}
                      formatValue={(v) => v.toFixed(1)}
                    />
                    <MetricCard
                      title="Token Efficiency"
                      value={analytics.totalTokens / analytics.totalMessages}
                      icon={<Brain size={20} className="text-orange-500" />}
                      formatValue={(v) => `${v.toFixed(0)} tok/msg`}
                    />
                  </div>

                  {/* Usage Patterns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <CardTitle>Usage by Time of Day</CardTitle>
                        <CardDescription>When users are most active</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <Clock size={48} className="mx-auto mb-2 opacity-50" />
                            <p>Hourly usage heatmap</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <CardTitle>Task Distribution</CardTitle>
                        <CardDescription>What users ask for most</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { type: 'General Chat', percent: 45, color: 'bg-blue-500' },
                            { type: 'Code Help', percent: 28, color: 'bg-green-500' },
                            { type: 'Analysis', percent: 18, color: 'bg-purple-500' },
                            { type: 'Creative Writing', percent: 9, color: 'bg-yellow-500' }
                          ].map((task, i) => (
                            <div key={i} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{task.type}</span>
                                <span className="font-medium">{task.percent}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`${task.color} h-2 rounded-full transition-all duration-300`}
                                  style={{ width: `${task.percent}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* User Segmentation */}
                  <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <CardTitle>User Behavior Analysis</CardTitle>
                      <CardDescription>Understanding different user types</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 mb-2">32%</div>
                          <div className="font-medium text-blue-800">New Users</div>
                          <div className="text-sm text-blue-600 mt-1">First-time interactions</div>
                          <div className="text-xs text-blue-500 mt-2">Avg: 3.2 messages/session</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 mb-2">51%</div>
                          <div className="font-medium text-green-800">Returning Users</div>
                          <div className="text-sm text-green-600 mt-1">Regular interactions</div>
                          <div className="text-xs text-green-500 mt-2">Avg: 8.7 messages/session</div>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600 mb-2">17%</div>
                          <div className="font-medium text-purple-800">Power Users</div>
                          <div className="text-sm text-purple-600 mt-1">Heavy daily usage</div>
                          <div className="text-xs text-purple-500 mt-2">Avg: 24.3 messages/session</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Quality Tab */}
            <TabsContent value="quality" className="h-full m-0 p-6">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  {/* Quality Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      title="User Satisfaction"
                      value={analytics.averageRating}
                      icon={<Sparkle size={20} className="text-yellow-500" />}
                      formatValue={(v) => `${v.toFixed(1)}/5.0`}
                      description="average rating"
                    />
                    <MetricCard
                      title="Task Completion"
                      value={analytics.successRate}
                      icon={<CheckCircle size={20} className="text-green-500" />}
                      formatValue={formatPercentage}
                    />
                    <MetricCard
                      title="Error Recovery"
                      value={1 - analytics.errorRate}
                      icon={<Wrench size={20} className="text-blue-500" />}
                      formatValue={formatPercentage}
                      description="successful recoveries"
                    />
                    <MetricCard
                      title="Response Quality"
                      value={0.87}
                      icon={<Target size={20} className="text-purple-500" />}
                      formatValue={formatPercentage}
                      description="coherence score"
                    />
                  </div>

                  {/* Quality Analysis */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <CardTitle>Rating Distribution</CardTitle>
                        <CardDescription>User feedback breakdown</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            { stars: 5, count: 234, percent: 62 },
                            { stars: 4, count: 89, percent: 24 },
                            { stars: 3, count: 34, percent: 9 },
                            { stars: 2, count: 12, percent: 3 },
                            { stars: 1, count: 8, percent: 2 }
                          ].map((rating, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="flex items-center gap-1 w-20">
                                <span className="text-sm font-medium">{rating.stars}</span>
                                <Sparkle size={14} className="text-yellow-500" />
                              </div>
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${rating.percent}%` }}
                                />
                              </div>
                              <div className="text-sm text-gray-600 w-16 text-right">
                                {rating.count}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <CardTitle>Error Analysis</CardTitle>
                        <CardDescription>Common failure patterns</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { type: 'Context Loss', count: 23, trend: 'down', color: 'text-red-500' },
                            { type: 'Token Limit', count: 18, trend: 'stable', color: 'text-orange-500' },
                            { type: 'Rate Limiting', count: 12, trend: 'up', color: 'text-yellow-500' },
                            { type: 'Model Timeout', count: 8, trend: 'down', color: 'text-blue-500' },
                            { type: 'Parse Error', count: 5, trend: 'stable', color: 'text-gray-500' }
                          ].map((error, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <AlertTriangle size={16} className={error.color} />
                                <span className="font-medium">{error.type}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">{error.count}</span>
                                {error.trend === 'up' && <TrendUp size={14} className="text-red-500" />}
                                {error.trend === 'down' && <TrendDown size={14} className="text-green-500" />}
                                {error.trend === 'stable' && <Minus size={14} className="text-gray-500" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quality Insights */}
                  <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <CardTitle>Quality Insights & Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h4 className="font-semibold text-green-600 flex items-center gap-2">
                            <CheckCircle size={16} />
                            Strengths
                          </h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li>• High user satisfaction for creative tasks (4.7/5)</li>
                            <li>• Excellent code completion accuracy (94%)</li>
                            <li>• Fast response times for simple queries</li>
                            <li>• Low retry rate indicates good first-response quality</li>
                          </ul>
                        </div>
                        <div className="space-y-4">
                          <h4 className="font-semibold text-orange-600 flex items-center gap-2">
                            <AlertTriangle size={16} />
                            Areas for Improvement
                          </h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li>• Complex analysis tasks show lower satisfaction</li>
                            <li>• Context window management needs optimization</li>
                            <li>• Error recovery could be more graceful</li>
                            <li>• Long conversations show quality degradation</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Costs Tab */}
            <TabsContent value="costs" className="h-full m-0 p-6">
              <ScrollArea className="h-full">
                <div className="space-y-6">
                  {/* Cost Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      title="Total Cost"
                      value={analytics.costMetrics.totalCost}
                      icon={<Database size={20} className="text-green-500" />}
                      formatValue={formatCurrency}
                      description="this period"
                    />
                    <MetricCard
                      title="Cost per Message"
                      value={analytics.costMetrics.costPerMessage}
                      icon={<MessageCircle size={20} className="text-blue-500" />}
                      formatValue={formatCurrency}
                    />
                    <MetricCard
                      title="Monthly Projection"
                      value={analytics.costMetrics.monthlyProjection}
                      icon={<Calendar size={20} className="text-purple-500" />}
                      formatValue={formatCurrency}
                    />
                    <MetricCard
                      title="Efficiency Score"
                      value={0.78}
                      icon={<Zap size={20} className="text-yellow-500" />}
                      formatValue={formatPercentage}
                      description="cost efficiency"
                    />
                  </div>

                  {/* Cost Breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <CardTitle>Cost by Resource Type</CardTitle>
                        <CardDescription>Where the money goes</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {[
                            { type: 'Compute Time', cost: '$12.34', percent: 65, color: 'bg-blue-500' },
                            { type: 'Token Processing', cost: '$4.56', percent: 24, color: 'bg-green-500' },
                            { type: 'Memory Usage', cost: '$1.89', percent: 10, color: 'bg-purple-500' },
                            { type: 'Storage', cost: '$0.21', percent: 1, color: 'bg-gray-500' }
                          ].map((item, i) => (
                            <div key={i} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>{item.type}</span>
                                <span className="font-medium">{item.cost} ({item.percent}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`${item.color} h-2 rounded-full transition-all duration-300`}
                                  style={{ width: `${item.percent}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                      <CardHeader>
                        <CardTitle>Cost Optimization</CardTitle>
                        <CardDescription>Potential savings identified</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="font-medium text-green-800 mb-1">Cache Hit Optimization</div>
                            <div className="text-sm text-green-600 mb-2">
                              Improve cache hit rate from 73% to 85%
                            </div>
                            <div className="text-xs text-green-500">Potential savings: $2.34/month</div>
                          </div>
                          
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="font-medium text-blue-800 mb-1">Model Size Optimization</div>
                            <div className="text-sm text-blue-600 mb-2">
                              Use smaller model for simple queries
                            </div>
                            <div className="text-xs text-blue-500">Potential savings: $4.67/month</div>
                          </div>
                          
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="font-medium text-yellow-800 mb-1">Context Management</div>
                            <div className="text-sm text-yellow-600 mb-2">
                              Better context pruning strategies
                            </div>
                            <div className="text-xs text-yellow-500">Potential savings: $1.89/month</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cost Trends */}
                  <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                    <CardHeader>
                      <CardTitle>Cost Analysis by Task Type</CardTitle>
                      <CardDescription>Understanding cost drivers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3">Task Type</th>
                              <th className="text-left p-3">Avg Cost/Message</th>
                              <th className="text-left p-3">Token Usage</th>
                              <th className="text-left p-3">Compute Time</th>
                              <th className="text-left p-3">Total Cost</th>
                              <th className="text-left p-3">Efficiency</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { type: 'Simple Chat', cost: '$0.0012', tokens: '45', time: '0.8s', total: '$5.67', efficiency: '92%' },
                              { type: 'Code Generation', cost: '$0.0034', tokens: '128', time: '1.2s', total: '$8.94', efficiency: '78%' },
                              { type: 'Data Analysis', cost: '$0.0089', tokens: '342', time: '2.1s', total: '$12.45', efficiency: '65%' },
                              { type: 'Creative Writing', cost: '$0.0056', tokens: '234', time: '1.8s', total: '$7.23', efficiency: '71%' }
                            ].map((row, i) => (
                              <tr key={i} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{row.type}</td>
                                <td className="p-3">{row.cost}</td>
                                <td className="p-3">{row.tokens} avg</td>
                                <td className="p-3">{row.time}</td>
                                <td className="p-3 font-medium">{row.total}</td>
                                <td className="p-3">
                                  <span className={cn(
                                    "px-2 py-1 rounded-full text-xs",
                                    parseInt(row.efficiency) > 80 ? "bg-green-100 text-green-700" :
                                    parseInt(row.efficiency) > 70 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  )}>
                                    {row.efficiency}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default ModelAnalyticsDashboard
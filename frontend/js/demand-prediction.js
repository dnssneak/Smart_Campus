/**
 * Minimal Demand Prediction & Recommendation Module
 * Can be included on any page to show analytics insights
 */

// Simple analytics widget that can be added to any page
async function loadDemandInsights(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await apiCall('/demand-prediction/analytics?days=7');
        
        if (response.success && response.analytics) {
            const { peakHours, highDemandVenues, frequentlyBookedDays } = response.analytics;
            
            container.innerHTML = `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="margin-top: 0; color: #2c3e50;">📊 Smart Recommendations</h3>
                    
                    ${peakHours && peakHours.length > 0 ? `
                    <div style="margin: 10px 0;">
                        <strong>🕐 Best Times to Book:</strong>
                        <p style="margin: 5px 0; color: #555;">
                            Avoid peak hours: ${peakHours.slice(0, 3).map(h => h.timeRange).join(', ')}
                        </p>
                    </div>
                    ` : ''}
                    
                    ${highDemandVenues && highDemandVenues.length > 0 ? `
                    <div style="margin: 10px 0;">
                        <strong>🏢 Popular Venues:</strong>
                        <p style="margin: 5px 0; color: #555;">
                            ${highDemandVenues.slice(0, 2).map(v => v.name).join(', ')}
                        </p>
                    </div>
                    ` : ''}
                    
                    ${frequentlyBookedDays && frequentlyBookedDays.length > 0 ? `
                    <div style="margin: 10px 0;">
                        <strong>📅 Busiest Days:</strong>
                        <p style="margin: 5px 0; color: #555;">
                            ${frequentlyBookedDays.slice(0, 3).map(d => d.day).join(', ')}
                        </p>
                    </div>
                    ` : ''}
                    
                    <a href="analytics.html" style="display: inline-block; margin-top: 10px; color: #3498db; text-decoration: none;">
                        View Full Analytics →
                    </a>
                </div>
            `;
        }
    } catch (error) {
        // Silently fail - don't show error to user
        console.log('Analytics not available:', error.message);
        container.innerHTML = '';
    }
}

// Get venue recommendations for booking form
async function getVenueRecommendations(attendance, startTime, endTime, category = '') {
    try {
        const response = await apiCall('/demand-prediction/recommend-venues', 'POST', {
            expectedAttendance: parseInt(attendance),
            startDateTime: startTime,
            endDateTime: endTime,
            category: category
        });
        
        if (response.success) {
            return response.recommendations || [];
        }
    } catch (error) {
        console.log('Recommendations not available:', error.message);
    }
    return [];
}

// Show recommendations in a simple format
function displaySimpleRecommendations(recommendations, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !recommendations || recommendations.length === 0) return;
    
    const available = recommendations.filter(r => r.isAvailable).slice(0, 3);
    
    if (available.length === 0) {
        container.innerHTML = '<p style="color: #e74c3c;">⚠️ No venues available for selected time</p>';
        return;
    }
    
    container.innerHTML = `
        <div style="background: #e8f5e9; padding: 10px; border-radius: 6px; margin: 10px 0;">
            <strong>✅ Recommended Venues:</strong>
            ${available.map(v => `
                <div style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px;">
                    <strong>${v.name}</strong> - ${v.capacityMatch}
                    <span style="color: #27ae60; font-size: 0.9em;">(Score: ${v.matchScore}/100)</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Get optimal time slots for a venue
async function getOptimalSlots(venueId, date) {
    try {
        const response = await apiCall(`/demand-prediction/recommend-slots?venueId=${venueId}&date=${date}&duration=60`);
        
        if (response.success) {
            return response.recommendedSlots || [];
        }
    } catch (error) {
        console.log('Time slots not available:', error.message);
    }
    return [];
}

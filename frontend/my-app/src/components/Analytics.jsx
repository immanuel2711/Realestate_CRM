import React, { useEffect, useState } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";
import "./Analytics.css"; // CSS fix applied here

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [avgValues, setAvgValues] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [buyerInsights, setBuyerInsights] = useState(null);
  const [sellerInsights, setSellerInsights] = useState(null);
  const [demandSupply, setDemandSupply] = useState(null);
  const [marketValue, setMarketValue] = useState(null);
  const [conversionRate, setConversionRate] = useState(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [res1, res2, res3, res4, res5, res6, res7, res8] = await Promise.all([
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/top-locations"),
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/average-property-values"),
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/leads-pipeline"),
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/buyer-insights"),
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/seller-insights"),
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/market-demand-vs-supply"),
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/market-value"),
          fetch("https://realestate-crm-cfdg.onrender.com/analytics/conversion-rate") // ✅ new API
        ]);

        const json1 = await res1.json();
        const json2 = await res2.json();
        const json3 = await res3.json();
        const json4 = await res4.json();
        const json5 = await res5.json();
        const json6 = await res6.json();
        const json7 = await res7.json();
        const json8 = await res8.json();

        setData(json1);
        setAvgValues(json2);
        setPipeline(json3);
        setBuyerInsights(json4);
        setSellerInsights(json5);
        setDemandSupply(json6);
        setMarketValue(json7);
        setConversionRate(json8);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <p className="loading">Loading analytics...</p>;
  if (!data) return <p className="error">No analytics data found</p>;

  // Donut Chart options
  const donutOptions = {
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { boxWidth: 12, padding: 6, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.75)",
        titleColor: "#fff",
        bodyColor: "#fff",
        padding: 6,
        bodySpacing: 3,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const createDonutData = (items, keyName = "_id") => ({
    labels: items.map((i) => i[keyName] || i.type),
    datasets: [
      {
        data: items.map((i) => i.count),
        backgroundColor: [
          "#4f46e5",
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
        ],
        borderWidth: 0,
      },
    ],
  });

  // Buyer Donut
  const BuyerDonut = () => {
    if (!buyerInsights?.sizeDistribution) return <p>No buyer insights</p>;
    return (
      <Doughnut
        data={createDonutData(buyerInsights.sizeDistribution)}
        options={donutOptions}
      />
    );
  };

  // Seller Donut
  const SellerDonut = () => {
    if (!sellerInsights?.propertyTypes) return <p>No seller insights</p>;
    const arr = Object.entries(sellerInsights.propertyTypes).map(
      ([type, count]) => ({ _id: type, count })
    );
    return <Doughnut data={createDonutData(arr)} options={donutOptions} />;
  };

  // Additional Small Donuts
  const AdditionalBuyerDonuts = () => {
    if (!buyerInsights?.ageDistribution) return null;
    return (
      <div className="small-donut-grid">
        {buyerInsights.ageDistribution.map((age, idx) => (
          <div key={idx} className="small-donut-wrapper">
            <h4>{age._id}</h4>
            <Doughnut
              data={createDonutData([{ _id: age._id, count: age.count }])}
              options={donutOptions}
            />
          </div>
        ))}
      </div>
    );
  };

  const AdditionalSellerDonuts = () => {
    if (!sellerInsights?.locationDistribution) return null;
    return (
      <div className="small-donut-grid">
        {sellerInsights.locationDistribution.map((loc, idx) => (
          <div key={idx} className="small-donut-wrapper">
            <h4>{loc._id}</h4>
            <Doughnut
              data={createDonutData([{ _id: loc._id, count: loc.count }])}
              options={donutOptions}
            />
          </div>
        ))}
      </div>
    );
  };

  // Bar Chart for Top Cities by Average Property Value
  const TopCitiesBar = () => {
    if (!avgValues || avgValues.length === 0) return <p>No city value data</p>;
    const sorted = [...avgValues]
      .sort((a, b) => b.avgValue - a.avgValue)
      .slice(0, 5);
    const barData = {
      labels: sorted.map((c) => c.city),
      datasets: [
        {
          label: "Avg Property Value ($)",
          data: sorted.map((c) => c.avgValue),
          backgroundColor: "#3b82f6",
          borderRadius: 6,
        },
      ],
    };
    const barOptions = {
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.75)",
          titleColor: "#fff",
          bodyColor: "#fff",
        },
      },
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `$${val.toLocaleString()}`,
          },
        },
      },
      layout: {
        padding: 20, // 🔥 prevents cutting off edges
      },
    };
    return <Bar data={barData} options={barOptions} />;
  };

  return (
    <div className="analytics-dashboard">
      <h1>🏙️ Real Estate Analytics Dashboard</h1>

      <div className="analytics-grid">
        {/* Buyer Demand */}
        <div className="tile">
          <h2>
            🛒 <span>Buyer Demand</span>
          </h2>
          {data.topBuyerLocation?.message ? (
            <div className="stat-box">
              <span>{data.topBuyerLocation.message}</span>
              <span>{data.topBuyerLocation.count} buyers</span>
            </div>
          ) : (
            <p>No buyer data available</p>
          )}
        </div>

        {/* Seller Supply */}
        <div className="tile">
          <h2>
            🏠 <span>Seller Supply</span>
          </h2>
          {data.topSellerLocation?.message ? (
            <div className="stat-box">
              <span>{data.topSellerLocation.message}</span>
              <span>{data.topSellerLocation.count} listings</span>
            </div>
          ) : (
            <p>No seller data available</p>
          )}
        </div>

        {/* Avg Property Values (list) */}
        <div className="tile" style={{ gridColumn: "span 2" }}>
          <h2>
            💰 <span>Avg Property Values by City</span>
          </h2>
          {avgValues.length > 0 ? (
            avgValues.map((city, idx) => (
              <div key={idx} className="stat-box">
                <span>{city.city}</span>
                <span>
                  ${city.avgValue.toLocaleString()} ({city.count} listings)
                </span>
              </div>
            ))
          ) : (
            <p>No property value data available</p>
          )}
        </div>

        {/* Conversion Rate (NEW full width with progress bar) */}
        <div className="tile" style={{ gridColumn: "span 2" }}>
          <h2>
            🎯 <span>Perfomance(by Conversion Rate)</span>
          </h2>
          {conversionRate ? (
            <div className="conversion-box">
              <div className="conversion-text">
  <span>
    {conversionRate.completedLeads} / {conversionRate.totalLeads} leads
  </span>
  <span className="conversion-rate">
    {conversionRate.conversionRate}%
  </span>
</div>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${conversionRate.conversionRate}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <p>No conversion data</p>
          )}
        </div>

        {/* Bar Chart for Top Cities */}
        <div className="tile" style={{ gridColumn: "span 2" }}>
          <h2>
            📈 <span>Top Cities by Avg Property Value</span>
          </h2>
          <div className="chart-wrapper">
            <TopCitiesBar />
          </div>
        </div>

        {/* Leads Pipeline */}
        <div className="tile" style={{ gridColumn: "span 2" }}>
          <h2>
            📊 <span>Leads Pipeline</span>
          </h2>
          {pipeline ? (
            <div className="pipeline">
              <div>
                <h3>Status</h3>
                {Object.entries(pipeline.statusCounts).map(([status, count]) => (
                  <div key={status} className="stat-box">
                    <span>{status}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3>Source</h3>
                {Object.entries(pipeline.sourceCounts).map(
                  ([source, count]) => (
                    <div key={source} className="stat-box">
                      <span>{source}</span>
                      <span>{count}</span>
                    </div>
                  )
                )}
              </div>
              <div>
                <h3>Priority</h3>
                {Object.entries(pipeline.priorityCounts).map(
                  ([priority, count]) => (
                    <div key={priority} className="stat-box">
                      <span>{priority}</span>
                      <span>{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <p>No lead data available</p>
          )}
        </div>

        {/* Buyer Insights */}
        <div className="tile">
          <h2>
            👥 <span>Buyer Insights</span>
          </h2>
          <div className="chart-wrapper">
            <BuyerDonut />
          </div>
          <AdditionalBuyerDonuts />
        </div>

        {/* Seller Insights */}
        <div className="tile">
          <h2>
            🏡 <span>Seller Insights</span>
          </h2>
          <div className="chart-wrapper">
            <SellerDonut />
          </div>
          <AdditionalSellerDonuts />
        </div>

        {/* Demand vs Supply */}
        <div className="tile" style={{ gridColumn: "span 2" }}>
          <h2>
            ⚖️ <span>Market Demand vs Supply</span>
          </h2>
          {demandSupply ? (
            Object.entries(demandSupply).map(([city, val]) => (
              <div key={city} className="stat-box">
                <span>{city}</span>
                <span>
                  {val.buyers} buyers vs {val.sellers} sellers
                </span>
              </div>
            ))
          ) : (
            <p>No demand/supply data</p>
          )}
        </div>

        {/* Market Value */}
        <div className="tile" style={{ gridColumn: "span 2" }}>
          <h2>
            💵 <span>Market Value</span>
          </h2>
          {marketValue ? (
            <>
              <h3>Total Value by City</h3>
              {marketValue.totalByCity.map((c, idx) => (
                <div key={idx} className="stat-box">
                  <span>{c.city}</span>
                  <span>
                    ${c.totalValue.toLocaleString()} ({c.count})
                  </span>
                </div>
              ))}
              <h3 style={{ marginTop: "1rem" }}>Top 5 Most Valuable Listings</h3>
              {marketValue.topListings.map((l) => (
                <div key={l._id} className="stat-box">
                  <span>
                    {l.propertyLocation} - {l.propertyType}
                  </span>
                  <span>
                    ${parseFloat(l.propertyValue).toLocaleString()} ({l.bedrooms}{" "}
                    BR / {l.bathrooms} BA)
                  </span>
                </div>
              ))}
            </>
          ) : (
            <p>No market value data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

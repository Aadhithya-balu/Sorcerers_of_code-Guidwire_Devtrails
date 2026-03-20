def calculate_order_impact(total_orders, delivered_orders, disruption_hours):
    missed_orders = total_orders - delivered_orders

    efficiency = delivered_orders / total_orders if total_orders > 0 else 0

    disruption_impact = min(disruption_hours / 10, 1.0)

    return {
        "total_orders": total_orders,
        "delivered_orders": delivered_orders,
        "missed_orders": missed_orders,
        "efficiency": round(efficiency, 2),
        "disruption_impact": round(disruption_impact, 2)
    }
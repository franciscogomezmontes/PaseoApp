import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
}

interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
}

export function Marker(_props: MarkerProps): null {
  return null;
}

export function MapView({
  style,
  initialRegion,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  initialRegion?: Region;
  children?: React.ReactNode;
}) {
  const containerRef = useRef<any>(null);

  // Extract coordinates from first Marker child, fall back to initialRegion
  let lat: number | undefined;
  let lng: number | undefined;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && lat == null) {
      const props = child.props as Partial<MarkerProps>;
      if (props.coordinate) {
        lat = props.coordinate.latitude;
        lng = props.coordinate.longitude;
      }
    }
  });
  lat = lat ?? initialRegion?.latitude;
  lng = lng ?? initialRegion?.longitude;

  useEffect(() => {
    try {
      const el = containerRef.current;
      if (!el || lat == null || lng == null) return;
      // In React Native Web the ref may be a component instance; get the DOM node
      const domNode: HTMLElement =
        typeof el.appendChild === "function" ? el : el._nativeTag ?? el;
      if (typeof domNode.appendChild !== "function") return;

      const delta = 0.005;
      const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
      const src =
        `https://www.openstreetmap.org/export/embed.html` +
        `?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = "Mapa";
      iframe.style.cssText = "width:100%;height:100%;border:none;display:block";
      domNode.appendChild(iframe);

      return () => {
        if (domNode.contains(iframe)) domNode.removeChild(iframe);
      };
    } catch {
      // Silently fail — map simply won't render on this environment
    }
  }, [lat, lng]);

  return React.createElement(View, {
    ref: containerRef,
    style: [{ borderRadius: 8, overflow: "hidden" }, style],
  });
}

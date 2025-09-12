'use client';

console.log('TestMapComponent: File loaded successfully');

export default function TestMapComponent() {
  console.log('TestMapComponent: Component rendering');
  
  return (
    <div className="w-full h-full bg-blue-200 flex items-center justify-center">
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-bold">Test Map Component</h2>
        <p>If you see this, the component is loading properly!</p>
        <p>Map will be restored after debugging.</p>
      </div>
    </div>
  );
}

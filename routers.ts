        return {
          alertId,
          sensor: targetSensor,
          message: `Leak detected in sensor #${targetSensor.id}`,
          location: targetSensor.location,
        };
      }),
    
    resetSystem: publicProcedure.mutation(async () => {
      const sensors = await db.getAllSensors();
      
      for (const sensor of sensors) {
        await db.updateSensorStatus(sensor.id, "active");
      }
      
      return { success: true, resetCount: sensors.length };
    }),
    
    seedSensors: publicProcedure.mutation(async () => {
      // Check if sensors already exist
      const existing = await db.getAllSensors();
      if (existing.length > 0) {
        return { success: true, message: "Sensors already exist", count: existing.length };
      }
      
      // Create default sensors
      const defaultSensors = [
        { name: "Main Pipe", description: "Main water supply pipe", location: "Upper floor – Kitchen", pipeType: "main", positionX: 30, positionY: 25 },
        { name: "Secondary Pipe", description: "Secondary distribution pipe", location: "Ground floor – Bathroom", pipeType: "secondary", positionX: 70, positionY: 45 },
        { name: "Branch Pipe", description: "Branch pipe to utility room", location: "Basement – Utility Room", pipeType: "branch", positionX: 50, positionY: 75 },
      ];
      
      for (const sensor of defaultSensors) {
        await db.createSensor(sensor);
      }
      
      return { success: true, message: "Sensors created", count: defaultSensors.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;

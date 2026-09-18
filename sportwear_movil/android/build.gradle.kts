allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// Los módulos Android de varios plugins (flutter_secure_storage, jni, ...)
// vienen del pub cache — no se pueden editar desde este proyecto. Su propio
// build.gradle no desactiva "lintVital*", y con AGP 9 esa tarea choca con la
// integración de Kotlin ("org/jetbrains/kotlin/config/LanguageVersionSettings"
// no encontrado). Se desactiva por nombre de tarea en todos los subproyectos
// en vez de depender del bloque `lint {}` de cada módulo, porque
// "lintVital*" puede seguir corriendo aunque checkReleaseBuilds esté en
// false — ver también app/build.gradle.kts.
subprojects {
    tasks.matching { it.name.startsWith("lintVital") }.configureEach {
        enabled = false
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
